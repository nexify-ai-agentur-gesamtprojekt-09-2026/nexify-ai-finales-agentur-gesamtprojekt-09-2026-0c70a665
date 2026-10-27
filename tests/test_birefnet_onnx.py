"""Controlled Session/Graph doubles only. No native ONNX runtime/model is loaded."""
import copy
import hashlib
import json
import os
from pathlib import Path
from types import SimpleNamespace as NS
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
from tools import birefnet_onnx as adapter
ROOT=Path(__file__).resolve().parents[1]


class SessionDouble:
    def __init__(self):
        self.calls=[];self.failure=None
        x=np.linspace(-8,8,1024,dtype=np.float32)
        self.output=np.broadcast_to(x[None,None,None,:],adapter.OUTPUT_SHAPE).copy()
        self.providers=['CPUExecutionProvider'];self.input_name=adapter.INPUT_NAME
    def disable_fallback(self):self.fallback_disabled=True
    def get_providers(self):return self.providers
    def get_inputs(self):return [NS(name=self.input_name,type='tensor(float)',shape=adapter.INPUT_SHAPE)]
    def get_outputs(self):return [NS(name=adapter.OUTPUT_NAME,type='tensor(float)',shape=adapter.OUTPUT_SHAPE)]
    def run(self,names,feeds):
        self.calls.append((names,feeds))
        if self.failure:raise RuntimeError('synthetic native runtime failure')
        return [self.output]


def graph_double():
    def io(name,shape):
        return NS(name=name,type=NS(tensor_type=NS(elem_type=1,shape=NS(dim=[NS(dim_param='',dim_value=d) for d in shape]))))
    return NS(ir_version=8,functions=[],training_info=[],opset_import=[NS(domain='',version=17)],
              graph=NS(node=[NS(domain='',op_type='Identity',attribute=[])],sparse_initializer=[],
                       initializer=[NS(external_data=[],data_location=0,data_type=1)],
                       input=[io(adapter.INPUT_NAME,adapter.INPUT_SHAPE)],output=[io(adapter.OUTPUT_NAME,adapter.OUTPUT_SHAPE)]))


class BiRefNetAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.raw=b'SYNTHETIC_SESSION_DOUBLE_NOT_AN_ONNX_MODEL'
        self.manifest={'schema_version':1,'adapter':adapter.ADAPTER,'model_id':adapter.MODEL_ID,
         'model_revision':adapter.MODEL_REVISION,'source_weights_sha256':adapter.SOURCE_WEIGHTS_SHA256,
         'source_weights_bytes':adapter.SOURCE_WEIGHTS_BYTES,'source_code_sha256':adapter.SOURCE_CODE_SHA256,
         'source_config_sha256':adapter.SOURCE_CONFIG_SHA256,'source_card_sha256':adapter.SOURCE_CARD_SHA256,
         'license_id':'MIT','license_text_sha256':adapter.LICENSE_SHA256,'export_file':adapter.EXPORT_FILE,
         'export_sha256':adapter.sha(self.raw),'export_bytes':len(self.raw),'export_profile':adapter.EXPORT_PROFILE,
         'exporter_sha256':'0'*64,'export_evidence':'ISOLATED_SESSION_DOUBLE_NOT_REAL_EXPORT_OR_APPROVAL',
         'opset':17,'dtype':'float32','input_name':adapter.INPUT_NAME,'input_shape':adapter.INPUT_SHAPE,
         'output_name':adapter.OUTPUT_NAME,'output_shape':adapter.OUTPUT_SHAPE,'external_data':False,
         'runtime_contract':adapter.RUNTIME}
        self.config={'adapter':adapter.ADAPTER,'artifact_root':str(self.root),'manifest_file':'birefnet-export.json',
         'manifest_sha256':'0'*64,'expected_model_sha256':adapter.sha(self.raw),'max_model_bytes':10000,
         'max_session_working_bytes':128*1024**2,'max_tensor_working_bytes':128*1024**2,
         'max_graph_nodes':100,'max_input_pixels':1000,'max_inference_seconds':10}
        self.write_manifest();(self.root/adapter.EXPORT_FILE).write_bytes(self.raw)
        (self.root/'LICENSE.MIT').write_bytes((ROOT/'docs/licenses/birefnet-MIT.txt').read_bytes())
        self.graph=graph_double();self.check_calls=[];self.session=SessionDouble();self.session_initializations=[]
        self.onnx=NS(load_model_from_string=lambda raw:self.graph,TensorProto=NS(FLOAT=1),
            checker=NS(check_model=lambda model,full_check:self.check_calls.append(full_check)))
        self.ort=NS(get_available_providers=lambda:['CPUExecutionProvider'],SessionOptions=lambda:NS(),
            ExecutionMode=NS(ORT_SEQUENTIAL=0),GraphOptimizationLevel=NS(ORT_DISABLE_ALL=0))
        def create(raw,**kwargs):self.session_initializations.append((raw,kwargs));return self.session
        self.ort.InferenceSession=create
    def write_manifest(self):
        raw=json.dumps(self.manifest,sort_keys=True,separators=(',',':')).encode()
        (self.root/'birefnet-export.json').write_bytes(raw);self.config['manifest_sha256']=adapter.sha(raw)
    def load(self):
        with patch.object(adapter,'_runtime',return_value=(np,self.onnx,self.ort)):
            return adapter.BiRefNetOnnx(self.config)
    def image(self):
        image=Image.new('RGBA',(6,4),(13,72,193,255));image.putpixel((0,0),(91,82,73,0));image.putpixel((1,0),(45,21,99,128));return image

    def test_real_preprocess_named_session_run_sigmoid_and_original_rgb_integrity_with_double(self):
        model=self.load();image=self.image();before=image.tobytes();output,meta=model.apply(image)
        self.assertEqual(image.tobytes(),before)
        self.assertEqual(output.size,image.size);self.assertEqual(output.convert('RGB').tobytes(),image.convert('RGB').tobytes())
        self.assertEqual(output.getpixel((0,0))[3],0)
        self.assertTrue(np.all(np.asarray(output.getchannel('A'))<=np.asarray(image.getchannel('A'))))
        self.assertEqual(meta['input_rgb_sha256'],adapter.sha(image.convert('RGB').tobytes()))
        self.assertEqual(meta['output_alpha_sha256'],adapter.sha(output.getchannel('A').tobytes()))
        names,feeds=self.session.calls[0];self.assertEqual(names,['mask_logits']);self.assertEqual(list(feeds),['input_image'])
        tensor=feeds['input_image'];self.assertEqual(tensor.dtype,np.float32);self.assertEqual(list(tensor.shape),[1,3,1024,1024]);self.assertTrue(tensor.flags.c_contiguous)
        # Far bottom-right is a constant RGB region, so bilinear resize preserves its source values.
        expected=(np.array([13,72,193],dtype=np.float32)/255-np.array([.485,.456,.406],dtype=np.float32))/np.array([.229,.224,.225],dtype=np.float32)
        np.testing.assert_allclose(tensor[0,:,-1,-1],expected,rtol=1e-6)
        self.assertEqual(model.local_model_calls,1);self.assertEqual(meta['local_model_calls'],1)
        self.assertEqual(self.check_calls,[True]);self.assertTrue(self.session.fallback_disabled)
        options=self.session_initializations[0][1];self.assertEqual(options['providers'],['CPUExecutionProvider'])
        self.assertEqual(options['sess_options'].intra_op_num_threads,1)

    def test_one_session_reused_and_counts_are_per_apply(self):
        model=self.load();model.apply(self.image());_,meta=model.apply(self.image())
        self.assertEqual(len(self.session_initializations),1);self.assertEqual(model.local_model_calls,2);self.assertEqual(meta['local_model_calls'],1)

    def test_failure_and_deadline_still_record_one_local_attempt(self):
        model=self.load();self.session.failure=True
        with self.assertRaisesRegex(adapter.SegmentationRejected,'onnx_inference_failed'):model.apply(self.image())
        self.assertEqual(model.local_model_calls,1)
        self.session.failure=False
        with patch.object(adapter.time,'monotonic',side_effect=[0,0,11]):
            with self.assertRaisesRegex(adapter.SegmentationRejected,'deadline'):model.apply(self.image())
        self.assertEqual(model.local_model_calls,2)

    def test_missing_or_wrong_runtime_is_explicit_no_install_or_fallback(self):
        with patch.object(adapter.importlib,'import_module',side_effect=ImportError):
            with self.assertRaisesRegex(adapter.SegmentationRejected,'onnxruntime_not_installed'):adapter._runtime()
        with patch.object(adapter.importlib,'import_module',return_value=NS(__version__='not-pinned')):
            with self.assertRaisesRegex(adapter.SegmentationRejected,'version_not_verified'):adapter._runtime()

    def test_manifest_tamper_wrong_license_source_and_model_hash_fail_before_session(self):
        (self.root/'birefnet-export.json').write_bytes(b'changed')
        with self.assertRaisesRegex(adapter.SegmentationRejected,'manifest_hash'):self.load()
        self.write_manifest()
        for key,value in [('model_revision','not-approved'),('license_id','noncommercial'),('external_data',True),('dtype','float16'),('input_shape',[True,3,1024,1024])]:
            old=self.manifest[key];self.manifest[key]=value;self.write_manifest()
            with self.subTest(key=key),self.assertRaises(adapter.SegmentationRejected):self.load()
            self.manifest[key]=old
        self.write_manifest();(self.root/'LICENSE.MIT').write_bytes(b'wrong license')
        with self.assertRaisesRegex(adapter.SegmentationRejected,'license_text_hash'):self.load()
        (self.root/'LICENSE.MIT').write_bytes((ROOT/'docs/licenses/birefnet-MIT.txt').read_bytes())
        (self.root/adapter.EXPORT_FILE).write_bytes(b'other')
        with self.assertRaisesRegex(adapter.SegmentationRejected,'model_hash'):self.load()
        self.assertEqual(self.session_initializations,[])

    def test_file_links_and_model_budget_rejected(self):
        file=self.root/adapter.EXPORT_FILE;external=self.root/'outside';file.rename(external);file.symlink_to(external)
        with self.assertRaises(adapter.SegmentationRejected):self.load()
        file.unlink();os.link(external,file)
        with self.assertRaisesRegex(adapter.SegmentationRejected,'link'):self.load()
        self.assertEqual(external.read_bytes(),self.raw)
        file.unlink();file.write_bytes(self.raw)
        self.config['max_session_working_bytes']=1000
        with self.assertRaisesRegex(adapter.SegmentationRejected,'memory_admission'):self.load()
        self.assertEqual(self.session_initializations,[])

    def test_graph_custom_external_dynamic_random_and_bad_io_block_before_session(self):
        baseline=copy.deepcopy(self.graph)
        changes=[lambda g:setattr(g.initializer[0],'external_data',['outside']),
                 lambda g:setattr(g.node[0],'domain','custom'),lambda g:setattr(g.node[0],'op_type','RandomNormal'),
                 lambda g:setattr(g.input[0].type.tensor_type.shape.dim[0],'dim_param','batch'),
                 lambda g:setattr(g.output[0],'name','wrong')]
        for change in changes:
            self.graph=copy.deepcopy(baseline);change(self.graph.graph)
            with self.assertRaises(adapter.SegmentationRejected):self.load()
        self.assertEqual(self.session_initializations,[])

    def test_session_provider_and_names_cannot_fallback(self):
        self.session.providers=['CUDAExecutionProvider','CPUExecutionProvider']
        with self.assertRaisesRegex(adapter.SegmentationRejected,'provider'):self.load()
        self.session.providers=['CPUExecutionProvider'];self.session.input_name='wrong'
        with self.assertRaisesRegex(adapter.SegmentationRejected,'io_contract'):self.load()
        self.assertEqual(self.session.calls,[])

    def test_output_type_shape_nonfinite_and_degenerate_masks_quarantine(self):
        model=self.load()
        for value in [np.zeros((1,1,1,1),np.float32),np.zeros(adapter.OUTPUT_SHAPE,np.float64),
                      np.full(adapter.OUTPUT_SHAPE,np.nan,np.float32),np.zeros(adapter.OUTPUT_SHAPE,np.float32)]:
            self.session.output=value
            with self.assertRaises(adapter.SegmentationRejected):model.apply(self.image())
        self.assertEqual(model.local_model_calls,4)

    def test_input_pixel_color_and_orientation_gates_run_before_inference(self):
        model=self.load();image=self.image();image.info['icc_profile']=b'unverified'
        with self.assertRaisesRegex(adapter.SegmentationRejected,'color_encoding'):model.apply(image)
        image=self.image();exif=image.getexif();exif[274]=8
        with self.assertRaisesRegex(adapter.SegmentationRejected,'orientation'):model.apply(image)
        with self.assertRaisesRegex(adapter.SegmentationRejected,'memory_admission'):model.apply(Image.new('RGB',(1001,1)))
        self.assertEqual(model.local_model_calls,0)

    def test_direct_adapter_rejects_pillow_version_drift_before_inference(self):
        model=self.load()
        with patch('PIL.__version__','0.0.unverified'):
            with self.assertRaisesRegex(adapter.SegmentationRejected,'pillow_version_not_verified'):
                model.apply(self.image())
        self.assertEqual(model.local_model_calls,0)
